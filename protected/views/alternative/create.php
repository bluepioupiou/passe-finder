<?php
$this->breadcrumbs=array(
	'Alternatives'=>array('index'),
	'Create',
);

$this->menu=array(
	array('label'=>'List Alternative', 'url'=>array('index')),
	array('label'=>'Manage Alternative', 'url'=>array('admin')),
);
?>

<h1>Create Alternative</h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>