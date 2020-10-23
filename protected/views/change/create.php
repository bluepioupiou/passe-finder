<?php
$this->breadcrumbs=array(
	'Changes'=>array('index'),
	'Create',
);

$this->menu=array(
	array('label'=>'List Change', 'url'=>array('index')),
	array('label'=>'Manage Change', 'url'=>array('admin')),
);
?>

<h1>Create Change</h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>