<div class="view">

	<b><?php echo CHtml::encode($data->getAttributeLabel('name')); ?>:</b>
	<h3><?php echo CHtml::link(CHtml::encode($data->name), array('view', 'id'=>$data->id)); ?></h3>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('positionStart_id')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->positionStart->name), array('position/view', 'id'=>$data->positionStart->id)); ?>	
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('positionEnd_id')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->positionEnd->name), array('position/view', 'id'=>$data->positionEnd->id)); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('difficulty')); ?>:</b>
	<?php echo CHtml::encode($data->difficulty); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('description')); ?>:</b>
	<?php echo CHtml::encode($data->description); ?>
	<br />

</div>